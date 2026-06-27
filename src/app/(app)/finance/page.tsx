
"use client"
import React, { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
  } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { IndianRupee, ArrowUpRight, ArrowDownRight, Scale, Edit, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getCollections, getFinanceData, saveFinanceData } from "@/services/database";
import type { CollectionEntry, FinanceData } from "@/lib/types";
import BackButton from "@/components/back-button";

const initialIncomeVsExpenseData = [
  { month: "July", income: 18600, expense: 8000 },
  { month: "August", income: 30500, expense: 13980 },
  { month: "September", income: 23400, expense: 9800 },
  { month: "October", income: 27800, expense: 39080 },
];

export default function FinancePage() {
    const [financeData, setFinanceData] = useState<FinanceData | null>(null);
    const [collections, setCollections] = useState<CollectionEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();


    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [finData, collData] = await Promise.all([
                    getFinanceData(),
                    getCollections(),
                ]);
                setFinanceData(finData);
                setCollections(collData);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error fetching data', description: (error as Error).message });
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [toast]);

  const collectionsBySection = useMemo(() => {
      return collections.reduce((acc, entry) => {
          if(!acc[entry.section]) {
              acc[entry.section] = 0;
          }
          acc[entry.section] += entry.received;
          return acc;
      }, {} as Record<string, number>);
  }, [collections]);

  const dynamicIncomeItems = useMemo(() => {
    return Object.entries(collectionsBySection).map(([section, amount]) => ({
        item: `Collections (${section})`,
        amount,
    }));
  }, [collectionsBySection]);

  const totalAssets = useMemo(() => financeData?.assets.reduce((sum, item) => sum + item.amount, 0) || 0, [financeData]);
  const totalLiabilities = useMemo(() => financeData?.liabilities.reduce((sum, item) => sum + item.amount, 0) || 0, [financeData]);
  const equity = useMemo(() => totalAssets - totalLiabilities, [totalAssets, totalLiabilities]);
  
  const totalStaticIncome = useMemo(() => financeData?.income.reduce((sum, item) => sum + item.amount, 0) || 0, [financeData]);
  const totalCollectionsIncome = useMemo(() => dynamicIncomeItems.reduce((sum, item) => sum + item.amount, 0), [dynamicIncomeItems]);
  const totalIncome = totalStaticIncome + totalCollectionsIncome;

  const totalExpenses = useMemo(() => financeData?.expenses.reduce((sum, item) => sum + item.amount, 0) || 0, [financeData]);
  const netBalance = useMemo(() => totalIncome - totalExpenses, [totalIncome, totalExpenses]);

  if (loading) {
    return (
        <div className="flex items-center justify-center p-8 h-full">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    )
  }

  if (!financeData) {
      return <p>Could not load finance data.</p>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <BackButton className="hidden lg:inline-flex"/>
        <div>
            <h1 className="text-3xl font-bold">Finance Dashboard</h1>
            <p className="text-muted-foreground">
            An overview of the festival's financial status.
            </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">₹{totalIncome.toLocaleString()}</div>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">₹{totalExpenses.toLocaleString()}</div>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">₹{netBalance.toLocaleString()}</div>
            </CardContent>
        </Card>
      </div>
      
       <Card>
        <CardHeader>
            <CardTitle>Income vs. Expense (Demo)</CardTitle>
            <CardDescription>This is a static chart for demonstration purposes.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={initialIncomeVsExpenseData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} unit="₹" />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--accent))' }}
                            content={<ChartTooltipContent />}
                        />
                        <Legend content={<ChartLegendContent />} />
                        <Bar dataKey="income" fill="hsl(var(--primary))" name="Income" radius={4} />
                        <Bar dataKey="expense" fill="hsl(var(--destructive))" name="Expense" radius={4} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Balance Sheet</CardTitle>
                        <CardDescription>As of today</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Assets</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                       {financeData.assets.map(item => (
                         <TableRow key={item.item}>
                            <TableCell>{item.item}</TableCell>
                            <TableCell className="text-right">₹{item.amount.toLocaleString()}</TableCell>
                         </TableRow>
                       ))}
                       <TableRow className="font-bold">
                         <TableCell>Total Assets</TableCell>
                         <TableCell className="text-right">₹{totalAssets.toLocaleString()}</TableCell>
                       </TableRow>
                    </TableBody>
                </Table>
                 <Table className="mt-4">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Liabilities & Equity</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {financeData.liabilities.map(item => (
                         <TableRow key={item.item}>
                            <TableCell>{item.item}</TableCell>
                            <TableCell className="text-right">₹{item.amount.toLocaleString()}</TableCell>
                         </TableRow>
                       ))}
                       <TableRow>
                         <TableCell>Equity</TableCell>
                         <TableCell className="text-right">₹{equity.toLocaleString()}</TableCell>
                       </TableRow>
                       <TableRow className="font-bold">
                         <TableCell>Total Liabilities & Equity</TableCell>
                         <TableCell className="text-right">₹{(totalLiabilities + equity).toLocaleString()}</TableCell>
                       </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Income Statement</CardTitle>
                        <CardDescription>Current festival cycle</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Income</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                       {financeData.income.map(item => (
                         <TableRow key={item.item}>
                            <TableCell>{item.item}</TableCell>
                            <TableCell className="text-right text-green-500">+ ₹{item.amount.toLocaleString()}</TableCell>
                         </TableRow>
                       ))}
                       {dynamicIncomeItems.map(item => (
                         <TableRow key={item.item}>
                            <TableCell>{item.item}</TableCell>
                            <TableCell className="text-right text-green-500">+ ₹{item.amount.toLocaleString()}</TableCell>
                         </TableRow>
                       ))}
                       <TableRow className="font-bold">
                         <TableCell>Total Income</TableCell>
                         <TableCell className="text-right">₹{totalIncome.toLocaleString()}</TableCell>
                       </TableRow>
                    </TableBody>
                </Table>
                 <Table className="mt-4">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Expenses</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {financeData.expenses.map(item => (
                         <TableRow key={item.item}>
                            <TableCell>{item.item}</TableCell>
                            <TableCell className="text-right text-red-500">- ₹{item.amount.toLocaleString()}</TableCell>
                         </TableRow>
                       ))}
                       <TableRow className="font-bold">
                         <TableCell>Total Expenses</TableCell>
                         <TableCell className="text-right">₹{totalExpenses.toLocaleString()}</TableCell>
                       </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
